console.log("Profile script loaded");

document.addEventListener('DOMContentLoaded', () => {
    let currentPostId = null;

    // ========== UTILITY FUNCTIONS ==========
    function getCSRFToken() {
        return document.querySelector('input[name=csrfmiddlewaretoken]')?.value || '';
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all transform translate-x-full ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`;
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

    function showModal(modal) {
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function hideModal(modal) {
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
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

    // ========== BIO FUNCTIONALITY ==========
    const bioBtn = document.getElementById('bioBtn');
    const bioForm = document.getElementById('bioForm');
    const bioDisplay = document.getElementById('bioDisplay');
    const cancelBioBtn = document.getElementById('cancelBioBtn');
    const bioTextarea = document.getElementById('bioTextarea');

    if (bioBtn && bioForm) {
        console.log("bioBtn and bioForm found");
        
        // Show bio form when update button is clicked
        bioBtn.addEventListener('click', () => {
            console.log("bioBtn clicked");
            bioForm.classList.remove('hidden');
            bioBtn.classList.add('hidden');
            bioDisplay.classList.add('hidden');
            
            // Focus on textarea and move cursor to end
            if (bioTextarea) {
                bioTextarea.focus();
                bioTextarea.setSelectionRange(bioTextarea.value.length, bioTextarea.value.length);
            }
        });
        
        // Cancel bio editing
        if (cancelBioBtn) {
            cancelBioBtn.addEventListener('click', () => {
                bioForm.classList.add('hidden');
                bioBtn.classList.remove('hidden');
                bioDisplay.classList.remove('hidden');
            });
        }
        
        // Handle bio form submission
        bioForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(bioForm);
            const submitButton = bioForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            
            // Show loading state
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
            
            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
                    }
                });
                
                if (response.ok) {
                    // Update the bio text display
                    const newBioText = bioTextarea.value || 'No bio available';
                    document.getElementById('bioText').textContent = newBioText;
                    
                    // Hide form and show display
                    bioForm.classList.add('hidden');
                    bioBtn.classList.remove('hidden');
                    bioDisplay.classList.remove('hidden');
                    
                    // Update button text
                    bioBtn.textContent = bioTextarea.value ? 'Update Bio' : 'Add Bio';
                    
                    // Show success message
                    showNotification('Bio updated successfully!');
                } else {
                    showNotification('Failed to update bio. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Error updating bio:', error);
                showNotification('An error occurred while updating bio.', 'error');
            } finally {
                // Reset button state
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }

    // Character counter for bio textarea
    if (bioTextarea) {
        const maxLength = 500;
        const counterElement = document.createElement('div');
        counterElement.className = 'text-right text-sm text-gray-500 mt-1';
        counterElement.id = 'bioCounter';
        bioTextarea.parentNode.appendChild(counterElement);
        
        function updateCounter() {
            const remaining = maxLength - bioTextarea.value.length;
            counterElement.textContent = `${remaining} characters remaining`;
            
            if (remaining < 50) {
                counterElement.className = 'text-right text-sm text-red-500 mt-1';
            } else {
                counterElement.className = 'text-right text-sm text-gray-500 mt-1';
            }
        }
        
        bioTextarea.addEventListener('input', updateCounter);
        updateCounter(); // Initialize counter
    }

    // ========== PASSWORD CHANGE FUNCTIONALITY ==========
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const closeChangePasswordModal = document.getElementById('closeChangePasswordModal');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const submitBtn = document.getElementById('changePasswordSubmit');
    const submitText = document.getElementById('submitText');
    const loadingText = document.getElementById('loadingText');
    const passwordError = document.getElementById('passwordError');

    function showError(message) {
        if (passwordError) {
            passwordError.textContent = message;
            passwordError.classList.remove('hidden');
        }
    }

    function hideError() {
        if (passwordError) {
            passwordError.classList.add('hidden');
        }
    }

    function closePasswordModal() {
        if (changePasswordModal) {
            hideModal(changePasswordModal);
            if (changePasswordForm) changePasswordForm.reset();
            hideError();
        }
    }

    if (changePasswordBtn && changePasswordModal) {
        changePasswordBtn.addEventListener('click', () => {
            showModal(changePasswordModal);
        });

        if (closeChangePasswordModal) {
            closeChangePasswordModal.addEventListener('click', closePasswordModal);
        }

        changePasswordModal.addEventListener('click', (e) => {
            if (e.target === changePasswordModal) {
                closePasswordModal();
            }
        });

        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                hideError();

                const token = changePasswordForm.querySelector('input[name=csrfmiddlewaretoken]').value;
                const currentPassword = document.getElementById('currentPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmNewPassword = document.getElementById('confirmNewPassword').value;

                // Client-side validation
                if (newPassword !== confirmNewPassword) {
                    showError('New password and confirm password do not match.');
                    return;
                }

                if (newPassword.length < 8) {
                    showError('Password must be at least 8 characters long.');
                    return;
                }

                // Show loading state
                if (submitBtn && submitText && loadingText) {
                    submitBtn.disabled = true;
                    submitText.classList.add('hidden');
                    loadingText.classList.remove('hidden');
                }

                try {
                    const response = await fetch('/api/change-password/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': token,
                        },
                        body: JSON.stringify({
                            current_password: currentPassword,
                            new_password: newPassword,
                        }),
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        showNotification('Password changed successfully!');
                        closePasswordModal();
                    } else {
                        showError(data.detail || 'Failed to change password. Please check your current password.');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showError('An error occurred while changing the password.');
                } finally {
                    // Hide loading state
                    if (submitBtn && submitText && loadingText) {
                        submitBtn.disabled = false;
                        submitText.classList.remove('hidden');
                        loadingText.classList.add('hidden');
                    }
                }
            });
        }
    }

    // ========== POST INTERACTIONS ==========
    
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
                    // Update like button based on server response
                    this.classList.toggle('liked', data.liked);
                    likeCount.textContent = data.like_count;
                    
                    // Animate the count change
                    if (data.liked && !isLiked) {
                        animateNumber(likeCount, currentCount, data.like_count);
                    } else if (!data.liked && isLiked) {
                        animateNumber(likeCount, currentCount, data.like_count);
                    }
                } else {
                    showNotification('Failed to update like status', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('An error occurred while updating like status', 'error');
            }
        });
    });

    // Comment button functionality
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            currentPostId = this.getAttribute('data-post-id');
            
            // Create comments modal if it doesn't exist
            let commentsModal = document.getElementById('commentsModal');
            if (!commentsModal) {
                commentsModal = createCommentsModal();
                document.body.appendChild(commentsModal);
            }
            
            showModal(commentsModal);
            
            const modalCommentsList = document.getElementById('modalCommentsList');
            
            try {
                const response = await fetch(`/api/posts/${currentPostId}/comments/`);
                
                if (response.ok) {
                    const comments = await response.json();
                    
                    if (comments.length === 0) {
                        modalCommentsList.innerHTML = `
                            <div class="text-center py-12">
                                <i class="fas fa-comments text-6xl text-gray-300 mb-4"></i>
                                <h4 class="text-xl font-semibold text-gray-600 mb-2">No comments yet</h4>
                                <p class="text-gray-500">Be the first to share your thoughts!</p>
                            </div>
                        `;
                    } else {
                        modalCommentsList.innerHTML = comments.map((comment, index) => `
                            <div class="comment-item mb-6 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow" style="animation: slideInLeft 0.3s ease ${index * 0.1}s both;">
                                <div class="flex items-start space-x-3">
                                    ${comment.user.profile?.avatar ? 
                                        `<img src="${comment.user.profile.avatar.url}" class="w-10 h-10 rounded-full border-2 border-blue-200 flex-shrink-0" alt="User avatar">` : 
                                        `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-2 border-blue-200 flex-shrink-0">
                                            <i class="fas fa-user text-white text-sm"></i>
                                        </div>`
                                    }
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center space-x-2 mb-2">
                                            <span class="font-semibold text-gray-900">${comment.user.f_name} ${comment.user.l_name}</span>
                                            <span class="text-xs text-gray-500">${new Date(comment.created_at).toLocaleString()}</span>
                                        </div>
                                        <p class="text-gray-700 leading-relaxed">${comment.body}</p>
                                    </div>
                                </div>
                            </div>
                        `).join('');
                    }
                } else {
                    modalCommentsList.innerHTML = `
                        <div class="text-center py-12">
                            <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
                            <h4 class="text-xl font-semibold text-red-600 mb-2">Failed to load comments</h4>
                            <p class="text-gray-500">Please try again later</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error loading comments:', error);
                modalCommentsList.innerHTML = `
                    <div class="text-center py-12">
                        <i class="fas fa-wifi text-6xl text-gray-300 mb-4"></i>
                        <h4 class="text-xl font-semibold text-gray-600 mb-2">Connection Error</h4>
                        <p class="text-gray-500">Please check your internet connection</p>
                    </div>
                `;
            }
        });
    });

    // Create comments modal function
    function createCommentsModal() {
        const modal = document.createElement('div');
        modal.id = 'commentsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content max-w-2xl mx-auto">
                <div class="relative bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
                    <button id="closeCommentsModal" class="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                    <h3 class="text-2xl font-bold flex items-center">
                        <i class="fas fa-comments mr-3"></i>Comments
                    </h3>
                </div>
                <div class="p-6 max-h-96 overflow-y-auto" id="modalCommentsList">
                    <!-- Comments will be loaded here -->
                </div>
                <div class="border-t p-4">
                    <form id="modalCommentForm" class="flex items-end space-x-3">
                        <div class="flex-1">
                            <textarea 
                                id="modalCommentInput" 
                                placeholder="Write a comment..." 
                                class="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows="2"
                                maxlength="500"
                            ></textarea>
                        </div>
                        <button 
                            type="submit" 
                            class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
                        >
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            </div>
        `;
        
        // Add event listeners to the modal
        const closeBtn = modal.querySelector('#closeCommentsModal');
        closeBtn.addEventListener('click', () => {
            hideModal(modal);
            currentPostId = null;
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal);
                currentPostId = null;
            }
        });
        
        // Comment form submission
        const commentForm = modal.querySelector('#modalCommentForm');
        const commentInput = modal.querySelector('#modalCommentInput');
        
        commentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!currentPostId || !commentInput.value.trim()) return;
            
            const commentText = commentInput.value.trim();
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalHTML = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
            commentInput.value = '';
            
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
                    const modalCommentsList = document.getElementById('modalCommentsList');
                    
                    const commentHtml = `
                        <div class="comment-item mb-6 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow" style="animation: slideInLeft 0.3s ease;">
                            <div class="flex items-start space-x-3">
                                ${newComment.user.profile?.avatar ? 
                                    `<img src="${newComment.user.profile.avatar.url}" class="w-10 h-10 rounded-full border-2 border-blue-200 flex-shrink-0" alt="User avatar">` : 
                                    `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-2 border-blue-200 flex-shrink-0">
                                        <i class="fas fa-user text-white text-sm"></i>
                                    </div>`
                                }
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center space-x-2 mb-2">
                                        <span class="font-semibold text-gray-900">${newComment.user.f_name} ${newComment.user.l_name}</span>
                                        <span class="text-xs text-gray-500">${new Date(newComment.created_at).toLocaleString()}</span>
                                    </div>
                                    <p class="text-gray-700 leading-relaxed">${newComment.body}</p>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    if (modalCommentsList.querySelector('.text-center')) {
                        modalCommentsList.innerHTML = commentHtml;
                    } else {
                        modalCommentsList.insertAdjacentHTML('afterbegin', commentHtml);
                    }

                    // Update comment count in post
                    const postCard = document.querySelector(`.post-card[data-post-id="${currentPostId}"]`);
                    if (postCard) {
                        const commentBtn = postCard.querySelector('.comment-btn');
                        if (commentBtn) {
                            const match = commentBtn.textContent.match(/(\d+)/);
                            const currentCount = match ? parseInt(match[1]) : 0;
                            commentBtn.textContent = `${currentCount + 1} Comments`;
                        }
                    }

                    showNotification('Comment added successfully!');
                } else {
                    const error = await response.json().catch(() => ({ detail: 'Failed to post comment' }));
                    showNotification(error.detail || 'Failed to post comment', 'error');
                    commentInput.value = commentText;
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('An error occurred while posting the comment', 'error');
                commentInput.value = commentText;
            } finally {
                submitBtn.innerHTML = originalHTML;
                submitBtn.disabled = false;
            }
        });
        
        return modal;
    }

    // Post options menu functionality
    document.querySelectorAll('.options-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = btn.nextElementSibling;
            document.querySelectorAll('.options-menu').forEach(m => m.classList.add('hidden'));
            if (menu) {
                menu.classList.toggle('hidden');
            }
        });
    });

    // Close options menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.options-btn') && !e.target.closest('.options-menu')) {
            document.querySelectorAll('.options-menu').forEach(m => m.classList.add('hidden'));
        }
    });

    // Update and Delete post functionality (placeholders - need backend implementation)
    document.querySelectorAll('.updateBtn').forEach(btn => {
        btn.addEventListener('click', function() {
            const postId = this.closest('.post-card').querySelector('[data-post-id]').getAttribute('data-post-id');
            showNotification('Update functionality coming soon!', 'error');
            // TODO: Implement update post functionality
        });
    });

    document.querySelectorAll('.deleteBtn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const postCard = this.closest('.post-card');
            const postId = postCard.querySelector('[data-post-id]').getAttribute('data-post-id');
            
            if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

            try {
                const response = await fetch(`/api/posts/${postId}/`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRFToken': getCSRFToken(),
                    },
                });

                if (response.ok) {
                    postCard.style.transform = 'translateX(100%)';
                    postCard.style.opacity = '0';
                    setTimeout(() => postCard.remove(), 300);
                    showNotification('Post deleted successfully!');
                } else {
                    const error = await response.json().catch(() => ({ detail: 'Failed to delete post' }));
                    showNotification(error.detail || 'Failed to delete post', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Error deleting post', 'error');
            }
        });
    });

    // ========== KEYBOARD SHORTCUTS ==========
    document.addEventListener('keydown', (e) => {
        // Escape key to close modals
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                hideModal(activeModal);
                if (activeModal.id === 'commentsModal') {
                    currentPostId = null;
                }
            }
        }
    });

    // ========== CSS ANIMATIONS ==========
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInLeft {
            from {
                transform: translateX(-30px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            backdrop-filter: blur(5px);
        }
        
        .modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease-out;
        }
        
        .modal-content {
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            max-width: 90vw;
            max-height: 90vh;
            overflow: hidden;
            animation: slideInUp 0.3s ease-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideInUp {
            from {
                transform: translateY(30px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        .comment-item:hover {
            transform: translateX(5px);
        }
        
        .like-btn.liked {
            color: #e53e3e;
        }
        
        .like-btn.liked i {
            color: #e53e3e;
        }
        
        .options-menu {
            z-index: 1000;
        }
    `;
    document.head.appendChild(style);

    console.log('Profile script initialized successfully! 🚀');
});