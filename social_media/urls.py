from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core import views
from django.contrib.auth.views import LogoutView
from django.conf import settings
from django.conf.urls.static import static
router = DefaultRouter()
router.register(r'posts', views.PostViewSet, basename='post')

handler404 = 'core.views.custom_404'
urlpatterns = [
    path('admin/', admin.site.urls),
    path('register/', views.register, name='register'),
    path('accounts/register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('accounts/login/', views.login_view, name='login'),
    path('logout/', LogoutView.as_view(next_page='login'), name='logout'),
    path('accounts/resend-verification-code/', views.resend_verification_code, name='resend_verification_code'),
    path('accounts/register/verify_email/', views.verify_email, name='verify_email'),
    path('profile/<slug:slug>/', views.profile_view, name='profile'),
    path('profile/', views.profile_view, name='current_profile'),
    path('api/change-password/', views.change_password, name='change_password_api'),
    path('settings/', views.settings, name='settings'),
    path('post/<int:pk>/update/', views.post_update, name='post_update'),
    path('post/<int:pk>/delete/', views.post_delete, name='post_delete'),
    path('', views.home, name='home'),
    path('api/', include(router.urls)),
    path('api/posts/public/', views.PostViewSet.as_view({'get': 'public'}), name='public-posts'),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)