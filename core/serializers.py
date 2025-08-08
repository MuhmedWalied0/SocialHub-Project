from rest_framework import serializers
from .models import Post, User, PostReact,Comment

class PostReactSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostReact
        fields = ['id', 'user', 'post', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class PostSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    like_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'body', 'image', 'privacy', 'user', 'status', 'created_at', 'updated_at', 'like_count', 'is_liked']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'like_count', 'is_liked']

    def get_like_count(self, obj):
        return obj.postreact_set.count()

    def get_is_liked(self, obj):
        user = self.context.get('request').user
        if user.is_authenticated:
            return obj.postreact_set.filter(user=user).exists()
        return False


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'f_name', 'l_name']

class CommentSerializer(serializers.ModelSerializer):
    post = serializers.PrimaryKeyRelatedField(read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'user', 'post', 'body', 'created_at']
        read_only_fields = ['user', 'post', 'created_at']
