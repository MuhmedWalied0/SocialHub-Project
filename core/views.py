from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate, logout
from django.contrib import messages
from django.views.decorators.csrf import csrf_protect
from .forms import RegisterForm, LoginForm, SettingsForm
from .models import User, Post, Profile, Setting,Comment
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .serializers import PostSerializer,CommentSerializer


def home(request):
    posts = Post.objects.all().order_by('-created_at')
    posts_with_likes = []
    if request.user.is_authenticated:
        for post in posts:
            post_data = {
                'post': post,
                'is_liked': post.postreact_set.filter(user=request.user).exists(),
            }
            posts_with_likes.append(post_data)
    else:
        for post in posts:
            post_data = {
                'post': post,
                'is_liked': False,
            }
            posts_with_likes.append(post_data)

    context = {
        'posts': posts_with_likes,
    }
    return render(request, 'core/home.html', context)


@csrf_protect
def register(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.set_password(form.cleaned_data['password'])
            user.is_active = True
            user.save()
            Setting.objects.create(user=user)
            Profile.objects.create(user=user)
            login(request, user)
            messages.success(request, 'Registration successful!')
            return redirect('home')
        else:
            messages.error(request, form.errors)
    else:
        form = RegisterForm()
    return render(request, 'core/register.html', {'form': form})


@csrf_protect
def login_view(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']
            user = authenticate(request, email=email, password=password)
            if user is not None:
                login(request, user)
                return redirect('home')
            else:
                messages.error(request, 'Invalid email or password.')
        else:
            messages.error(request, form.errors)
    else:
        form = LoginForm()
    return render(request, 'core/login.html', {'form': form})


def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
def profile(request):
    user = request.user
    profile = user.profile
    posts = Post.objects.filter(user=user).order_by('-created_at')
    context = {
        'user': user,
        'profile': profile,
        'posts': posts,
    }
    return render(request, 'core/profile.html')


@login_required
def settings(request):
    user = request.user
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
    }
    return render(request, 'core/settings.html', context)


class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all().order_by('-created_at')
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

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

    def public(self, request):
        posts = Post.objects.filter(privacy='public').order_by('-created_at')
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)
    
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
