document.addEventListener('DOMContentLoaded', () => {
    let currentPostId = null;

    const elements = {
        createPostTrigger: document.getElementById('createPostTrigger'),
        createPostBtn: document.getElementById('createPostBtn'),
        cancelPostBtn: document.getElementById('cancelPostBtn'),
        postForm: document.getElementById('postForm'),
        commentsModal: document.getElementById('commentsModal'),
        updateModal: document.getElementById('updatePostModal'),
        modalCommentsList: document.getElementById('modalCommentsList'),
        modalCommentForm: document.getElementById('modalCommentForm'),
        modalCommentInput: document.getElementById('modalCommentInput'),
        updatePostForm: document.getElementById('updatePostForm'),
        updatePostBody: document.getElementById('updatePostBody'),
        updatePostPrivacy: document.getElementById('updatePostPrivacy'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        mobileMenu: document.getElementById('mobileMenu'),
        scrollToTop: document.getElementById('scrollToTop')
    };

    // Mobile menu toggle
    if (elements.mobileMenuBtn && elements.mobileMenu) {
        elements.mobileMenuBtn.addEventListener('click', () => {
            elements.mobileMenu.classList.toggle('hidden');
        });
    }

    // Scroll to top functionality
    if (elements.scrollToTop) {
        elements.scrollToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                elements.scrollToTop.style.display = 'flex';
            } else {
                elements.scrollToTop.style.display = 'none';
            }
        });
    }

    function getCSRFToken() {
        return document.querySelector('input[name=csrfmiddlewaretoken]')?.value || '';
    }

    function showModal(modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function hideModal(modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all transform translate-x-full bg-${type === 'success' ? '5865f2' : 'ff6b6b'} text-white`;
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.remove('translate-x-full'), 100);
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function animateNumber(element, start, end, duration = 500) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 16);
    }

    // Create post functionality
    if (elements.createPostTrigger && elements.postForm) {
        elements.createPostTrigger.addEventListener('click', () => {
            elements.postForm.classList.remove('hidden');
            elements.createPostTrigger.style.display = 'none';
            elements.postForm.querySelector('textarea').focus();
        });
    }

    if (elements.cancelPostBtn) {
        elements.cancelPostBtn.addEventListener('click', () => {
            elements.postForm.classList.add('hidden');
            elements.createPostTrigger.style.display = 'block';
            elements.postForm.reset();
        });
    }

    // Post form submission
    if (elements.postForm) {
        elements.postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = elements.postForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Publishing...';
            submitBtn.disabled = true;
            
            const formData = new FormData(elements.postForm);
            
            try {
                const response = await fetch('/api/posts/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCSRFToken(),
                    },
                    body: formData,
                });
                
                if (response.ok) {
                    showNotification('Post published successfully!');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    const error = await response.json().catch(() => ({ detail: 'Failed to create post' }));
                    showNotification(error.detail || 'Failed to create post', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('An error occurred while creating the post.', 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Like button functionality
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const postId = this.getAttribute('data-post-id');
            const likeCount = this.querySelector('.like-count');
            const currentCount = parseInt(likeCount.textContent) || 0;
            const isLiked = this.classList.contains('liked');

            try {
                const response = await fetch(`/api/posts/${postId}/toggle_like/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken(),
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    this.classList.toggle('liked', data.liked);
                    animateNumber(likeCount, currentCount, data.like_count);
                } else {
                    showNotification('Failed to update like status', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('An error occurred while updating like status', 'error');
            }
        });
    });

    // Options menu functionality
    document.querySelectorAll('.options-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const menu = this.nextElementSibling;
            
            document.querySelectorAll('.options-menu').forEach(m => {
                if (m !== menu) m.classList.add('hidden');
            });
            
            menu.classList.toggle('hidden');
        });
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.options-btn') && !e.target.closest('.options-menu')) {
            document.querySelectorAll('.options-menu').forEach(menu => {
                menu.classList.add('hidden');
            });
        }
    });

    // Update post functionality
    document.querySelectorAll('.update-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            currentPostId = this.getAttribute('data-post-id');
            
            try {
                const response = await fetch(`/api/posts/${currentPostId}/`);
                if (!response.ok) throw new Error('Failed to load post data');
                const post = await response.json();

                elements.updatePostBody.value = post.body;
                elements.updatePostPrivacy.value = post.privacy;

                showModal(elements.updateModal);
                
                document.querySelectorAll('.options-menu').forEach(menu => {
                    menu.classList.add('hidden');
                });
            } catch (error) {
                showNotification('Error loading post data', 'error');
                console.error(error);
            }
        });
    });

    // Delete post functionality
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const postId = this.getAttribute('data-post-id');
            
            if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

            const postDiv = document.querySelector(`.post-card[data-post-id="${postId}"]`);
            postDiv.style.opacity = '0.5';
            postDiv.style.pointerEvents = 'none';

            try {
                const response = await fetch(`/api/posts/${postId}/`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRFToken': getCSRFToken(),
                    },
                });

                if (response.ok) {
                    postDiv.style.transform = 'translateX(100%)';
                    setTimeout(() => postDiv.remove(), 300);
                    showNotification('Post deleted successfully!');
                } else {
                    postDiv.style.opacity = '1';
                    postDiv.style.pointerEvents = 'auto';
                    const error = await response.json().catch(() => ({ detail: 'Failed to delete post' }));
                    showNotification(error.detail || 'Failed to delete post', 'error');
                }
            } catch (error) {
                postDiv.style.opacity = '1';
                postDiv.style.pointerEvents = 'auto';
                console.error('Error:', error);
                showNotification('Error deleting post', 'error');
            }
        });
    });

    // Update post form submission
    if (elements.updatePostForm) {
        elements.updatePostForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (!currentPostId) return;

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
            submitBtn.disabled = true;

            try {
                const response = await fetch(`/api/posts/${currentPostId}/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken(),
                    },
                    body: JSON.stringify({
                        body: elements.updatePostBody.value,
                        privacy: elements.updatePostPrivacy.value,
                    }),
                });

                if (response.ok) {
                    const postDiv = document.querySelector(`.post-card[data-post-id="${currentPostId}"]`);
                    if (postDiv) {
                        postDiv.querySelector('.post-body').textContent = elements.updatePostBody.value;
                        const privacySpan = postDiv.querySelector('.flex.items-center span:last-child');
                        if (privacySpan) {
                            const privacy = elements.updatePostPrivacy.value;
                            privacySpan.innerHTML = privacy === 'public' 
                                ? '<i class="fas fa-globe text-green-500 mr-1"></i>Public'
                                : '<i class="fas fa-lock text-orange-500 mr-1"></i>Private';
                        }
                    }

                    hideModal(elements.updateModal);
                    showNotification('Post updated successfully!');
                    currentPostId = null;
                } else {
                    const error = await response.json().catch(() => ({ detail: 'Failed to update post' }));
                    showNotification(error.detail || 'Failed to update post', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Error updating post', 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Delete post from modal
    document.getElementById('deletePostFromModal')?.addEventListener('click', async () => {
        if (!currentPostId) return;
        if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

        try {
            const response = await fetch(`/api/posts/${currentPostId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                },
            });

            if (response.ok) {
                const postDiv = document.querySelector(`.post-card[data-post-id="${currentPostId}"]`);
                if (postDiv) {
                    postDiv.style.transform = 'translateX(100%)';
                    setTimeout(() => postDiv.remove(), 300);
                }

                hideModal(elements.updateModal);
                showNotification('Post deleted successfully!');
                currentPostId = null;
            } else {
                const error = await response.json().catch(() => ({ detail: 'Failed to delete post' }));
                showNotification(error.detail || 'Failed to delete post', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error deleting post', 'error');
        }
    });

    // Comments modal close
    document.getElementById('closeCommentsModal')?.addEventListener('click', () => {
        hideModal(elements.commentsModal);
        elements.modalCommentsList.innerHTML = '';
        if (elements.modalCommentInput) elements.modalCommentInput.value = '';
        currentPostId = null;
    });

    // Update modal close
    document.getElementById('closeUpdateModal')?.addEventListener('click', () => {
        hideModal(elements.updateModal);
        currentPostId = null;
    });

    // Comments functionality
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            currentPostId = this.getAttribute('data-post-id');
            showModal(elements.commentsModal);
            
            try {
                const response = await fetch(`/api/posts/${currentPostId}/comments/`);
                
                if (response.ok) {
                    const comments = await response.json();
                    
                    if (comments.length === 0) {
                        elements.modalCommentsList.innerHTML = `
                            <div class="text-center py-12">
                                <i class="fas fa-comments text-6xl text-gray-300 mb-4"></i>
                                <h4 class="text-xl font-semibold text-gray-600 mb-2">No comments yet</h4>
                                <p class="text-gray-500">Be the first to share your thoughts!</p>
                            </div>
                        `;
                    } else {
                        elements.modalCommentsList.innerHTML = comments.map((comment, index) => `
                            <div class="comment-item mb-6 p-4 bg-[#222222] rounded-xl border border-[#333333] hover:shadow-md transition-shadow" style="animation: slideInLeft 0.3s ease ${index * 0.1}s both;">
                                <div class="flex items-start space-x-3">
                                    ${comment.user.profile?.avatar ? 
                                        `<img src="${comment.user.profile.avatar.url}" class="w-10 h-10 rounded-full border-2 border-[#5865f2] flex-shrink-0" alt="User avatar">` : 
                                        `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#5865f2] to-[#00ddeb] flex items-center justify-center border-2 border-[#5865f2] flex-shrink-0">
                                            <i class="fas fa-user text-white text-sm"></i>
                                        </div>`
                                    }
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center space-x-2 mb-2">
                                            <span class="font-semibold text-[#e4e6eb]">${comment.user.f_name} ${comment.user.l_name}</span>
                                            <span class="text-xs text-[#b0b3b8]">${new Date(comment.created_at).toLocaleString()}</span>
                                        </div>
                                        <p class="text-[#e4e6eb] leading-relaxed">${comment.body}</p>
                                    </div>
                                </div>
                            </div>
                        `).join('');
                    }
                } else {
                    elements.modalCommentsList.innerHTML = `
                        <div class="text-center py-12">
                            <i class="fas fa-exclamation-triangle text-6xl text-[#ff6b6b] mb-4"></i>
                            <h4 class="text-xl font-semibold text-[#ff6b6b] mb-2">Failed to load comments</h4>
                            <p class="text-[#b0b3b8]">Please try again later</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error loading comments:', error);
                elements.modalCommentsList.innerHTML = `
                    <div class="text-center py-12">
                        <i class="fas fa-wifi text-6xl text-[#b0b3b8] mb-4"></i>
                        <h4 class="text-xl font-semibold text-[#b0b3b8] mb-2">Connection Error</h4>
                        <p class="text-[#b0b3b8]">Please check your internet connection</p>
                    </div>
                `;
            }
        });
    });

    // Comment form submission
    if (elements.modalCommentForm) {
        elements.modalCommentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!currentPostId || !elements.modalCommentInput.value.trim()) return;
            
            const commentText = elements.modalCommentInput.value.trim();
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
            elements.modalCommentInput.value = '';
            
            try {
                const response = await fetch(`/api/posts/${currentPostId}/comments/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken(),
                    },
                    body: JSON.stringify({ body: commentText }),
                });
                
                if (response.ok) {
                    const newComment = await response.json();
                    
                    const commentHtml = `
                        <div class="comment-item mb-6 p-4 bg-[#222222] rounded-xl border border-[#333333] hover:shadow-md transition-shadow" style="animation: slideInLeft 0.3s ease;">
                            <div class="flex items-start space-x-3">
                                ${newComment.user.profile?.avatar ? 
                                    `<img src="${newComment.user.profile.avatar.url}" class="w-10 h-10 rounded-full border-2 border-[#5865f2] flex-shrink-0" alt="User avatar">` : 
                                    `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#5865f2] to-[#00ddeb] flex items-center justify-center border-2 border-[#5865f2] flex-shrink-0">
                                        <i class="fas fa-user text-white text-sm"></i>
                                    </div>`
                                }
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center space-x-2 mb-2">
                                        <span class="font-semibold text-[#e4e6eb]">${newComment.user.f_name} ${newComment.user.l_name}</span>
                                        <span class="text-xs text-[#b0b3b8]">${new Date(newComment.created_at).toLocaleString()}</span>
                                    </div>
                                    <p class="text-[#e4e6eb] leading-relaxed">${newComment.body}</p>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    if (elements.modalCommentsList.querySelector('.text-center')) {
                        elements.modalCommentsList.innerHTML = commentHtml;
                    } else {
                        elements.modalCommentsList.insertAdjacentHTML('afterbegin', commentHtml);
                    }

                    const postDiv = document.querySelector(`.post-card[data-post-id="${currentPostId}"]`);
                    if (postDiv) {
                        const commentCountSpan = postDiv.querySelector('.comment-count');
                        if (commentCountSpan) {
                            const currentCount = parseInt(commentCountSpan.textContent) || 0;
                            animateNumber(commentCountSpan, currentCount, currentCount + 1);
                        }
                    }

                    showNotification('Comment added successfully!');
                } else {
                    const error = await response.json().catch(() => ({ detail: 'Failed to post comment' }));
                    showNotification(error.detail || 'Failed to post comment', 'error');
                    elements.modalCommentInput.value = commentText;
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('An error occurred while posting the comment', 'error');
                elements.modalCommentInput.value = commentText;
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Modal close functionality
    document.querySelectorAll('.modal .absolute button').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            hideModal(modal);
            if (modal === elements.commentsModal || modal === elements.updateModal) {
                currentPostId = null;
            }
            if (modal === elements.commentsModal) {
                elements.modalCommentsList.innerHTML = '';
                if (elements.modalCommentInput) elements.modalCommentInput.value = '';
            }
        });
    });

    // Click outside to close modals
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideModal(this);
                if (this === elements.commentsModal || this === elements.updateModal) {
                    currentPostId = null;
                }
                if (this === elements.commentsModal) {
                    elements.modalCommentsList.innerHTML = '';
                    if (elements.modalCommentInput) elements.modalCommentInput.value = '';
                }
            }
        });
    });

    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const visibleModal = document.querySelector('.modal[style*="display: flex"]');
            if (visibleModal) {
                hideModal(visibleModal);
                if (visibleModal === elements.commentsModal || visibleModal === elements.updateModal) {
                    currentPostId = null;
                }
                if (visibleModal === elements.commentsModal) {
                    elements.modalCommentsList.innerHTML = '';
                    if (elements.modalCommentInput) elements.modalCommentInput.value = '';
                }
            }
        }
    });

    // Add CSS animations dynamically
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInLeft {
            from { transform: translateX(-30px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.05); opacity: 0.8; }
            70% { transform: scale(0.9); opacity: 0.9; }
            100% { transform: scale(1); opacity: 1; }
        }
        .comment-item:hover {
            transform: translateX(5px);
        }
        .navbar {
            animation: slideDown 0.6s ease-out;
        }
        @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .card {
            animation: fadeInUp 0.6s ease-out forwards;
        }
        @keyframes fadeInUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.post-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.animationPlayState = 'paused';
        observer.observe(card);
    });

    // Auto-resize textareas
    function autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', function() {
            autoResize(this);
        });
        
        textarea.addEventListener('focus', function() {
            this.style.borderColor = '#5865f2';
            this.style.boxShadow = '0 0 0 3px rgba(88, 101, 242, 0.1)';
        });
        
        textarea.addEventListener('blur', function() {
            this.style.borderColor = '#333333';
            this.style.boxShadow = 'none';
        });
    });

    // Enhanced share functionality
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const postId = this.closest('.post-card').getAttribute('data-post-id');
            const postText = this.closest('.post-card').querySelector('.post-body').textContent;
            const postUrl = `${window.location.origin}/post/${postId}`;
            
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Check out this post on SocialHub',
                        text: postText,
                        url: postUrl
                    });
                    showNotification('Post shared successfully!');
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        fallbackShare(postUrl, postText);
                    }
                }
            } else {
                fallbackShare(postUrl, postText);
            }
        });
    });

    function fallbackShare(url, text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(`${text}\n\n${url}`).then(() => {
                showNotification('Link copied to clipboard!');
            }).catch(() => {
                showShareModal(url, text);
            });
        } else {
            showShareModal(url, text);
        }
    }

    function showShareModal(url, text) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="relative bg-gradient-to-r from-[#5865f2] to-[#00ddeb] text-white p-6 rounded-t-2xl">
                    <button class="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors close-share-modal">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                    <h3 class="text-2xl font-bold flex items-center">
                        <i class="fas fa-share mr-3"></i>Share Post
                    </h3>
                </div>
                <div class="p-6 bg-[#1e1e1e]">
                    <p class="text-[#b0b3b8] mb-4">Share this post with your friends</p>
                    <div class="space-y-3">
                        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}" 
                            target="_blank" 
                            class="flex items-center p-3 bg-[#2a2a2a] hover:bg-[#333333] rounded-lg transition-colors">
                            <i class="fab fa-twitter text-[#5865f2] text-xl mr-3"></i>
                            <span class="text-[#e4e6eb]">Share on Twitter</span>
                        </a>
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" 
                            target="_blank" 
                            class="flex items-center p-3 bg-[#2a2a2a] hover:bg-[#333333] rounded-lg transition-colors">
                            <i class="fab fa-facebook text-[#5865f2] text-xl mr-3"></i>
                            <span class="text-[#e4e6eb]">Share on Facebook</span>
                        </a>
                        <button class="copy-link-btn flex items-center p-3 bg-[#2a2a2a] hover:bg-[#333333] rounded-lg transition-colors w-full text-left" data-url="${url}">
                            <i class="fas fa-link text-[#b0b3b8] text-xl mr-3"></i>
                            <span class="text-[#e4e6eb]">Copy Link</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-share-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        modal.querySelector('.copy-link-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(url).then(() => {
                showNotification('Link copied to clipboard!');
                modal.remove();
            });
        });
    }

    // Add loading state to buttons
    function addLoadingState(button, originalText, loadingText) {
        button.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${loadingText}`;
        button.disabled = true;
        
        return () => {
            button.innerHTML = originalText;
            button.disabled = false;
        };
    }

    // Enhanced error handling
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showNotification('Something went wrong. Please try again.', 'error');
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement.tagName === 'TEXTAREA') {
                const form = activeElement.closest('form');
                if (form) {
                    form.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            if (elements.createPostTrigger && !elements.postForm.classList.contains('hidden')) {
                elements.postForm.querySelector('textarea').focus();
            } else if (elements.createPostTrigger) {
                elements.createPostTrigger.click();
            }
        }
    });

    // Performance optimization: Lazy load images
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });

    // Add smooth scrolling for better UX
    document.documentElement.style.scrollBehavior = 'smooth';

    console.log('SocialHub initialized successfully! 🚀');
});