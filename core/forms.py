from django import forms
from .models import Setting, Profile, User

class RegisterForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput)
    confirm_password = forms.CharField(widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ['f_name', 'l_name', 'email', 'password']

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')
        if password and confirm_password and password != confirm_password:
            raise forms.ValidationError("Passwords do not match.")
        return cleaned_data

class LoginForm(forms.Form):
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)

class SettingsForm(forms.ModelForm):
    class Meta:
        model = Setting
        fields = ['post_privacy', 'profile_visibility']
        widgets = {
            'post_privacy': forms.Select(choices=Setting.PRIVACY_CHOICES),
            'profile_visibility': forms.Select(choices=Setting.PRIVACY_CHOICES),
        }

class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ['bio']
        widgets = {
            'bio': forms.Textarea(attrs={'class': 'w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500', 'rows': 4, 'placeholder': 'Write your bio here...'}),
        }