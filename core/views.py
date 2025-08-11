from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate, logout, update_session_auth_hash
from django.contrib import messages
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.forms import PasswordChangeForm
from django.db.models import Q
from django.core.mail import send_mail
from django.conf import settings as django_settings
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .forms import RegisterForm, LoginForm, SettingsForm, PostForm
from .models import User, Post, Profile, Setting, Comment, EmailVerification
from .serializers import PostSerializer, CommentSerializer
import json
import random
import string
from django.utils import timezone
from datetime import timedelta


# ========================
# Authentication Views
# ========================

@csrf_protect
def register(request):
    """Handles user registration and sends verification code."""
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.set_password(form.cleaned_data['password1'])
            user.is_active = True
            user.is_verified = False
            user.save()
            Setting.objects.create(user=user)
            Profile.objects.create(user=user)

            verification, created = EmailVerification.objects.get_or_create(user=user)
            verification.generate_code()

            send_mail(
                'Your Verification Code',
                f'Your verification code is: {verification.code}',
                django_settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )

            messages.success(request, 'Registration successful! Please check your email for the verification code.')
            return redirect('verify_email')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{error}")
    else:
        form = RegisterForm()
    return render(request, 'core/register.html', {'form': form})

@csrf_protect
def verify_email(request):
    """Verifies email using code and email, ensuring code is linked to the user."""
    if request.method == 'POST':
        email = request.POST.get('email')
        code = request.POST.get('code')
        try:
            user = User.objects.get(email=email)
            verification = EmailVerification.objects.get(user=user)
            if verification.code == code:
                if verification.is_expired():
                    verification.generate_code()
                    send_mail(
                        'Your new Verification Code',
                        f'Your new verification code is: {verification.code}',
                        django_settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=False,
                    )
                    messages.error(request, 'Your code has expired. A new code has been sent to your email.')
                    return redirect('verify_email')

                user.is_verified = True
                user.save()
                verification.delete()
                messages.success(request, 'Email verified successfully! You can now log in.')
                return redirect('login')
            else:
                messages.error(request, 'Invalid verification code.')
        except User.DoesNotExist:
            messages.error(request, 'No account found with this email.')
        except EmailVerification.DoesNotExist:
            messages.error(request, 'No verification code found for this email.')
    return render(request, 'core/verify_email.html')

@csrf_protect
def resend_verification_code(request):
    """Resends verification code to the specified email."""
    if request.method == 'POST':
        email = request.POST.get('email')
        try:
            user = User.objects.get(email=email)
            if user.is_verified:
                messages.info(request, 'Your email is already verified.')
                return redirect('login')

            verification, created = EmailVerification.objects.get_or_create(user=user)
            verification.generate_code()

            send_mail(
                'Your new Verification Code',
                f'Your new verification code is: {verification.code}',
                django_settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            messages.success(request, 'A new verification code has been sent to your email.')
            return redirect('verify_email')

        except User.DoesNotExist:
            messages.error(request, 'No account found with this email.')
    return render(request, 'core/resend_verification_code.html')

from django.views.decorators.csrf import csrf_protect
from django.contrib import messages
from django.contrib.auth import authenticate, login
from django.shortcuts import render, redirect

@csrf_protect
def login_view(request):
    """Handles user login."""
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']
            user = authenticate(request, email=email, password=password)
            if user is not None:
                if getattr(user, 'is_verified', True):
                    login(request, user)
                    return redirect('home')
                else:
                    messages.error(request, 'Your account is not verified yet.')
            else:
                messages.error(request, 'Invalid email or password.')
        else:
            messages.error(request, form.errors)
    else:
        form = LoginForm()
    return render(request, 'core/login.html', {'form': form})


def logout_view(request):
    """Handles user logout."""
    logout(request)
    return redirect('login')

# ========================
# Profile and Settings Views
# ========================

@login_required
def profile_view(request, slug=None):
    """Displays user profile and posts, and handles bio update via POST."""
    if slug is None:
        # حالة عرض البروفايل الخاص بالمستخدم الحالي
        user = request.user
        is_owner = True
    else:
        # حالة عرض بروفايل مستخدم آخر
        profile = get_object_or_404(Profile, slug=slug)
        user = profile.user
        is_owner = (user == request.user)

    profile = user.profile
    
    # التحقق من إعدادات الخصوصية
    if not is_owner:
        setting = Setting.objects.filter(user=user).first()
        profile_visibility = setting.profile_visibility if setting else 'public'
        is_private = (profile_visibility == 'private')
    else:
        is_private = False

    # جلب المنشورات حسب حالة الخصوصية
    if is_owner or not is_private:
        posts = Post.objects.filter(user=user).order_by('-created_at')
    else:
        posts = []

    # معالجة تحديث السيرة الذاتية
    if request.method == 'POST' and is_owner:
        bio = request.POST.get('bio', '').strip()
        if bio:
            profile.bio = bio
            profile.save()
            return JsonResponse({'success': True, 'message': 'Bio updated successfully!'})
        return JsonResponse({'success': False, 'error': 'Bio cannot be empty.'}, status=400)

    context = {
        'user': user,
        'profile': profile,
        'posts': posts,
        'is_owner': is_owner,
        'is_private': is_private,
    }
    return render(request, 'core/profile.html', context)


@login_required
def settings(request):
    """Handles user settings updates."""
    user = request.user
    setting, created = Setting.objects.get_or_create(user=user)
    if request.method == 'POST':
        form = SettingsForm(request.POST, instance=user.setting)
        if form.is_valid():
            form.save()
            messages.success(request, 'Settings updated successfully!')
            return redirect('settings')
        else:
            messages.error(request, form.errors)
    else:
        form = SettingsForm(instance=user.setting)
    context = {
        'user': user,
        'form': form,
        'setting': setting,
    }
    return render(request, 'core/settings.html', context)

@login_required
@require_http_methods(["POST"])
def change_password(request):
    """API endpoint for changing user password via AJAX."""
    try:
        data = json.loads(request.body)
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        form_data = {
            'old_password': current_password,
            'new_password1': new_password,
            'new_password2': new_password,
        }
        
        form = PasswordChangeForm(user=request.user, data=form_data)
        
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)
            
            return JsonResponse({
                'success': True,
                'message': 'Password changed successfully!'
            })
        else:
            return JsonResponse({
                'success': False,
                'detail': 'Invalid password. Please check your current password and try again.',
                'errors': form.errors
            }, status=400)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'detail': 'Invalid JSON data'
        }, status=400)
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': 'An unexpected error occurred'
        }, status=500)

@login_required
def change_password_form(request):
    """Traditional form-based password change."""
    user = request.user
    if request.method == 'POST':
        form = PasswordChangeForm(user=user, data=request.POST)
        if form.is_valid():
            form.save()
            update_session_auth_hash(request, user)
            messages.success(request, 'Password changed successfully!')
            return redirect('profile', user_id=user.id)
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = PasswordChangeForm(user=user)
   
    context = {
        'user': user,
        'form': form,
    }
    return render(request, 'core/change_password.html', context)

# ========================
# Post Management Views
# ========================

def home(request):
    """Displays home page with posts."""
    user = request.user
    posts = []
    if request.user.is_authenticated:
        posts = posts_with_likes(get_user_posts_with_public(user), user)
    else:
        posts = posts_with_likes(get_user_posts_with_public(user), False)

    context = {
        'posts': posts,
    }
    return render(request, 'core/home.html', context)

@login_required
def post_update(request, pk):
    """Updates a post."""
    post = get_object_or_404(Post, pk=pk, user=request.user)
    if request.method == 'POST':
        form = PostForm(request.POST, request.FILES, instance=post)
        if form.is_valid():
            form.save()
            return redirect('profile', user=request.user.id)
    else:
        form = PostForm(instance=post)
    return render(request, 'core/post_update.html', {'form': form, 'post': post})

@login_required
def post_delete(request, pk):
    """Deletes a post."""
    post = get_object_or_404(Post, pk=pk, user=request.user)
    if request.method == 'POST':
        post.delete()
        return redirect('profile', user=request.user.id)
    return render(request, 'core/post_confirm_delete.html', {'post': post})

# ========================
# Utility Views
# ========================

def custom_404(request, exception):
    """Custom 404 handler."""
    return render(request, 'core/404.html', status=404)

# ========================
# Helper Functions
# ========================

def get_user_posts_with_public(user):
    """Gets posts for authenticated user or public posts."""
    if user.is_authenticated:
        return Post.objects.filter(Q(user=user) | Q(privacy='public')).order_by('-created_at')
    else:
        return Post.objects.filter(privacy='public').order_by('-created_at')

def posts_with_likes(posts, user):
    """Adds like status to posts."""
    posts_with_likes = []
    if user:
        for post in posts:
            post_data = {
                'post': post,
                'is_liked': post.postreact_set.filter(user=user).exists(),
            }
            posts_with_likes.append(post_data)
    else:
        for post in posts:
            post_data = {
                'post': post,
                'is_liked': False,
            }
            posts_with_likes.append(post_data)
    return posts_with_likes

# ========================
# API Views
# ========================

class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return get_user_posts_with_public(self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def toggle_like(self, request, pk=None):
        post = self.get_object()
        user = request.user
        if not user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        react, created = post.postreact_set.get_or_create(user=user)
        if not created:
            react.delete()
            return Response({'status': 'unliked', 'like_count': post.postreact_set.count()}, status=status.HTTP_200_OK)
        return Response({'status': 'liked', 'like_count': post.postreact_set.count()}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        post = self.get_object()

        if request.method == 'GET':
            comments = Comment.objects.filter(post=post).order_by('-created_at')
            serializer = CommentSerializer(comments, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            if not request.user.is_authenticated:
                return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            serializer = CommentSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user=request.user, post=post)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                print(serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)