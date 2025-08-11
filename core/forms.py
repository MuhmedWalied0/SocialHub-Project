from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
import re
from .models import User, Post, Setting


class RegisterForm(UserCreationForm):
    f_name = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'First Name',
            'required': True
        }),
        label='First Name'
    )
    
    l_name = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Last Name',
            'required': True
        }),
        label='Last Name'
    )
    
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Email Address',
            'required': True
        }),
        label='Email Address'
    )
    
    password1 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Password',
            'required': True
        }),
        label='Password'
    )
    
    password2 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Confirm Password',
            'required': True
        }),
        label='Confirm Password'
    )

    class Meta:
        model = User
        fields = ('f_name', 'l_name', 'email', 'password1', 'password2')

    def clean_f_name(self):
        f_name = self.cleaned_data.get('f_name')
        if not f_name:
            raise ValidationError('First name is required.')
        if len(f_name.strip()) < 2:
            raise ValidationError('First name must be at least 2 characters long.')
        if not re.match("^[a-zA-Z\u0600-\u06FF\s]*$", f_name):
            raise ValidationError('First name can only contain letters.')
        return f_name.strip().title()

    def clean_l_name(self):
        l_name = self.cleaned_data.get('l_name')
        if not l_name:
            raise ValidationError('Last name is required.')
        if len(l_name.strip()) < 2:
            raise ValidationError('Last name must be at least 2 characters long.')
        if not re.match("^[a-zA-Z\u0600-\u06FF\s]*$", l_name):
            raise ValidationError('Last name can only contain letters.')
        return l_name.strip().title()

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if not email:
            raise ValidationError('Email is required.')
        email = email.lower().strip()
        if User.objects.filter(email=email).exists():
            raise ValidationError('This email address is already registered.')
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValidationError('Please enter a valid email address.')
        return email

    def clean_password1(self):
        password1 = self.cleaned_data.get('password1')
        if not password1:
            raise ValidationError('Password is required.')
        try:
            validate_password(password1)
        except ValidationError as e:
            raise ValidationError(e.messages)
        return password1

    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise ValidationError('Passwords do not match.')
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.f_name = self.cleaned_data['f_name']
        user.l_name = self.cleaned_data['l_name']
        if commit:
            user.save()
        return user


class LoginForm(forms.Form):
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Email Address',
            'required': True,
            'autocomplete': 'email'
        }),
        label='Email Address'
    )
    
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Password',
            'required': True,
            'autocomplete': 'current-password'
        }),
        label='Password'
    )

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email:
            return email.lower().strip()
        return email


class PostForm(forms.ModelForm):
    body = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'placeholder': 'What\'s on your mind?',
            'rows': 4,
            'required': True
        }),
        label='Post Content',
        max_length=2000
    )
    
    image = forms.ImageField(
        widget=forms.FileInput(attrs={
            'class': 'form-control',
            'accept': 'image/*'
        }),
        label='Image (optional)',
        required=False
    )
    
    privacy = forms.ChoiceField(
        choices=Post.PRIVACY_CHOICES,
        widget=forms.Select(attrs={
            'class': 'form-control'
        }),
        label='Privacy'
    )

    class Meta:
        model = Post
        fields = ('body', 'image', 'privacy')

    def clean_body(self):
        body = self.cleaned_data.get('body')
        if not body:
            raise ValidationError('Post content is required.')
        body = body.strip()
        if len(body) < 1:
            raise ValidationError('Post content cannot be empty.')
        if len(body) > 2000:
            raise ValidationError('Post content cannot exceed 2000 characters.')
        return body

    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image:
            if image.size > 5 * 1024 * 1024:
                raise ValidationError('Image file size cannot exceed 5MB.')
            valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
            if not any(image.name.lower().endswith(ext) for ext in valid_extensions):
                raise ValidationError('Please upload a valid image file (JPG, PNG, GIF, WebP).')
        return image


class SettingsForm(forms.ModelForm):
    post_privacy = forms.ChoiceField(
        choices=Setting.PRIVACY_CHOICES,
        widget=forms.Select(attrs={'class': 'form-control'}),
        label='Default Post Privacy'
    )
    
    profile_visibility = forms.ChoiceField(
        choices=Setting.PRIVACY_CHOICES,
        widget=forms.Select(attrs={'class': 'form-control'}),
        label='Profile Visibility'
    )

    class Meta:
        model = Setting
        fields = ('post_privacy', 'profile_visibility')


class EmailVerificationForm(forms.Form):
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Email Address',
            'required': True,
            'readonly': True
        }),
        label='Email Address'
    )
    
    code = forms.CharField(
        max_length=6,
        min_length=6,
        widget=forms.TextInput(attrs={
            'class': 'form-control text-center',
            'placeholder': '000000',
            'required': True,
            'style': 'font-size: 1.5rem; letter-spacing: 0.5rem;',
            'maxlength': '6',
            'pattern': '[0-9]{6}',
            'autocomplete': 'one-time-code'
        }),
        label='Verification Code'
    )

    def clean_code(self):
        code = self.cleaned_data.get('code')
        if not code:
            raise ValidationError('Verification code is required.')
        if not code.isdigit():
            raise ValidationError('Verification code must contain only numbers.')
        if len(code) != 6:
            raise ValidationError('Verification code must be exactly 6 digits.')
        return code

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email:
            return email.lower().strip()
        return email


class ResendVerificationForm(forms.Form):
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Email Address',
            'required': True
        }),
        label='Email Address'
    )

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if not email:
            raise ValidationError('Email is required.')
        email = email.lower().strip()
        try:
            user = User.objects.get(email=email)
            if user.is_verified:
                raise ValidationError('This email is already verified.')
        except User.DoesNotExist:
            raise ValidationError('No account found with this email address.')
        return email


class ProfileUpdateForm(forms.ModelForm):
    bio = forms.CharField(
        max_length=100,
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'placeholder': 'Tell us about yourself...',
            'rows': 3
        }),
        label='Bio',
        required=False
    )
    
    avatar = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Avatar URL (optional)'
        }),
        label='Avatar URL',
        required=False
    )

    class Meta:
        model = User
        fields = ()  # We'll handle profile fields separately

    def clean_bio(self):
        bio = self.cleaned_data.get('bio', '')
        if bio:
            bio = bio.strip()
            if len(bio) > 100:
                raise ValidationError('Bio cannot exceed 100 characters.')
        return bio

    def clean_avatar(self):
        avatar = self.cleaned_data.get('avatar', '')
        if avatar:
            avatar = avatar.strip()
            if not (avatar.startswith('http://') or avatar.startswith('https://')):
                raise ValidationError('Avatar URL must start with http:// or https://')
        return avatar
