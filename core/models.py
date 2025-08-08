from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from django_currentuser.middleware import get_current_user

class UserManager(BaseUserManager):
    def create_user(self, email, f_name, l_name, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, f_name=f_name, l_name=l_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, f_name, l_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, f_name, l_name, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    id = models.AutoField(primary_key=True)
    f_name = models.CharField(max_length=255, null=False)
    l_name = models.CharField(max_length=255, null=False)
    email = models.EmailField(unique=True, null=False)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['f_name', 'l_name']

    def __str__(self):
        return f"{self.f_name} {self.l_name}"

class Profile(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, unique=True)
    bio = models.CharField(max_length=100, blank=True)
    avatar = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Profile of {self.user.email}"

class Post(models.Model):
    PRIVACY_CHOICES = (
        ('public', 'Public'),
        ('friend', 'Friend'),
        ('private', 'Private'),
    )

    id = models.AutoField(primary_key=True)
    body = models.TextField(null=False)
    image = models.ImageField(upload_to='post_images/', blank=True, null=True)
    privacy = models.CharField(max_length=20, choices=PRIVACY_CHOICES, default='public')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Post by {self.user.email}"

    @property
    def is_liked_by(self):
        user = get_current_user()
        if user and user.is_authenticated:
            return self.postreact_set.filter(user=user).exists()
        return False

class Comment(models.Model):
    id = models.AutoField(primary_key=True)
    body = models.TextField(null=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Comment by {self.user.email} on post {self.post.id}"

class PostReact(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('user', 'post')

    def __str__(self):
        return f"React by {self.user.email} on post {self.post.id}"

class Setting(models.Model):
    PRIVACY_CHOICES = (
        ('public', 'Public'),
        ('friend', 'Friend'),
        ('private', 'Private'),
    )

    id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, unique=True)
    post_privacy = models.CharField(max_length=20, choices=PRIVACY_CHOICES, default='public')
    profile_visibility = models.CharField(max_length=20, choices=PRIVACY_CHOICES, default='public')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.user.email}"