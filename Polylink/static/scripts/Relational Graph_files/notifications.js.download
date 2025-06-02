// notifications.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.notifications-container');
    const trigger = container.querySelector('.notifications-link');
    const dropdown = container.querySelector('.notifications-dropdown');
    const notificationsList = container.querySelector('.notifications-list');
    
    let isHovering = false;
    let hoverTimeout;

    // Fonction pour afficher le dropdown
    function showDropdown() {
        dropdown.classList.add('active');
        loadNotificationPreviews();
    }

    // Fonction pour cacher le dropdown
    function hideDropdown() {
        dropdown.classList.remove('active');
    }

    // Fonction pour charger les aperçus des notifications
    function loadNotificationPreviews() {
        const notificationItems = document.querySelectorAll('.notification-item');
        notificationItems.forEach(item => {
            const notificationId = item.dataset.notificationId;
            const previewContainer = item.querySelector('.post-preview-content');
            const loadingIndicator = item.querySelector('.loading-indicator');

            if (!previewContainer.hasAttribute('data-loaded')) {
                fetch(`/notifications/${notificationId}/preview/`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            const preview = data.data;
                            previewContainer.innerHTML = `
                                <div class="preview-content">
                                    <p>${preview.post.content}</p>
                                    ${preview.post.image ? '<div class="preview-image-indicator"><i class="bi bi-image"></i></div>' : ''}
                                </div>
                            `;
                            previewContainer.setAttribute('data-loaded', 'true');
                            loadingIndicator.style.display = 'none';
                            previewContainer.style.display = 'block';
                        }
                    })
                    .catch(error => {
                        console.error('Erreur lors du chargement de l\'aperçu:', error);
                        loadingIndicator.textContent = 'Erreur de chargement';
                    });
            }
        });
    }

    // Fonction pour faire défiler jusqu'à une publication
    function scrollToPost(postId) {
        const targetPost = document.getElementById(`post-${postId}`);
        if (targetPost) {
            // Fermer le dropdown
            hideDropdown();
            
            // Faire défiler jusqu'à la publication
            targetPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Mettre en surbrillance la publication
            targetPost.classList.add('highlighted-post');
            setTimeout(() => {
                targetPost.classList.remove('highlighted-post');
            }, 2000);
        }
    }

    // Gestion du clic sur les notifications
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // Ne pas rediriger si on clique sur un bouton ou un formulaire
            if (e.target.closest('.mark-read-form') || 
                e.target.closest('.quick-reply-form') || 
                e.target.closest('.notification-actions')) {
                return;
            }
            
            const postId = this.dataset.postId;
            if (postId) {
                scrollToPost(postId);
                
                // Si la notification n'est pas lue, la marquer comme lue
                if (this.classList.contains('unread')) {
                    const markReadForm = this.querySelector('.mark-read-form');
                    if (markReadForm) {
                        fetch(markReadForm.action, {
                            method: 'POST',
                            headers: {
                                'X-CSRFToken': markReadForm.querySelector('input[name="csrfmiddlewaretoken"]').value,
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: new URLSearchParams(new FormData(markReadForm))
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                this.classList.remove('unread');
                                markReadForm.style.display = 'none';
                                updateNotificationBadge(data.unread_count);
                            }
                        })
                        .catch(error => console.error('Erreur:', error));
                    }
                }
            }
        });
    });

    // Gestion du clic sur le trigger
    trigger.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (dropdown.classList.contains('active')) {
            hideDropdown();
        } else {
            showDropdown();
        }
    });

    // Gestion du survol
    container.addEventListener('mouseenter', function() {
        isHovering = true;
        clearTimeout(hoverTimeout);
        showDropdown();
    });

    container.addEventListener('mouseleave', function() {
        isHovering = false;
        hoverTimeout = setTimeout(() => {
            if (!isHovering) {
                hideDropdown();
            }
        }, 300);
    });

    // Gestion des formulaires "Marquer comme lu"
    const markReadForms = document.querySelectorAll('.mark-read-form');
    markReadForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            fetch(this.action, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.querySelector('input[name="csrfmiddlewaretoken"]').value,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams(new FormData(this))
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const notificationItem = this.closest('.notification-item');
                    notificationItem.classList.remove('unread');
                    this.style.display = 'none';
                    
                    // Mettre à jour le badge
                    updateNotificationBadge(data.unread_count);
                }
            })
            .catch(error => console.error('Erreur:', error));
        });
    });

    // Gestion du formulaire "Tout marquer comme lu"
    const markAllReadForm = document.querySelector('.mark-all-read-form');
    if (markAllReadForm) {
        markAllReadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            fetch(this.action, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.querySelector('input[name="csrfmiddlewaretoken"]').value,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams(new FormData(this))
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Mettre à jour l'interface
                    document.querySelectorAll('.notification-item.unread').forEach(item => {
                        item.classList.remove('unread');
                        const markReadBtn = item.querySelector('.mark-read-form');
                        if (markReadBtn) markReadBtn.style.display = 'none';
                    });
                    
                    // Cacher le bouton "Tout marquer comme lu"
                    this.style.display = 'none';
                    
                    // Mettre à jour le badge
                    updateNotificationBadge(0);
                }
            })
            .catch(error => console.error('Erreur:', error));
        });
    }

    // Gestion des formulaires de réponse rapide
    const quickReplyForms = document.querySelectorAll('.quick-reply-form');
    quickReplyForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const input = this.querySelector('.quick-reply-input');
            const content = input.value.trim();
            
            if (content === '') return;
            
            fetch(this.action, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.querySelector('input[name="csrfmiddlewaretoken"]').value,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams(new FormData(this))
            })
            .then(response => {
                if (!response.ok) throw new Error('Erreur lors de l\'envoi du commentaire');
                input.value = '';
                
                // Afficher un message de confirmation
                showConfirmationMessage(this.parentNode, 'Commentaire envoyé');
            })
            .catch(error => {
                console.error('Erreur:', error);
                showConfirmationMessage(this.parentNode, 'Erreur lors de l\'envoi', true);
            });
        });
    });

    // Fonction pour mettre à jour le badge de notifications
    function updateNotificationBadge(count) {
        const badge = document.querySelector('.notifications-link .badge');
        if (count > 0) {
            if (badge) {
                badge.textContent = count;
            } else {
                const newBadge = document.createElement('span');
                newBadge.className = 'badge';
                newBadge.textContent = count;
                document.querySelector('.notifications-link i').appendChild(newBadge);
            }
        } else if (badge) {
            badge.remove();
        }
    }

    // Fonction pour afficher un message de confirmation
    function showConfirmationMessage(container, message, isError = false) {
        const msgElement = document.createElement('div');
        msgElement.className = `notification-message ${isError ? 'error' : 'success'}`;
        msgElement.innerHTML = `
            <i class="bi bi-${isError ? 'exclamation' : 'check'}-circle"></i>
            ${message}
        `;
        
        container.appendChild(msgElement);
        
        setTimeout(() => msgElement.remove(), 3000);
    }

    // Gestion de la pagination
    const loadMoreLink = document.querySelector('.load-more-notifications');
    if (loadMoreLink) {
        loadMoreLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            fetch(this.href)
                .then(response => response.text())
                .then(html => {
                    // Créer un élément temporaire pour parser le HTML
                    const temp = document.createElement('div');
                    temp.innerHTML = html;
                    
                    // Extraire les nouvelles notifications
                    const newNotifications = temp.querySelectorAll('.notification-item');
                    const paginationElement = temp.querySelector('.notifications-pagination');
                    
                    // Ajouter les nouvelles notifications
                    newNotifications.forEach(notification => {
                        notificationsList.insertBefore(notification, loadMoreLink.parentNode);
                    });
                    
                    // Mettre à jour ou supprimer le lien de pagination
                    if (paginationElement) {
                        loadMoreLink.parentNode.replaceWith(paginationElement);
                    } else {
                        loadMoreLink.parentNode.remove();
                    }
                    
                    // Charger les aperçus des nouvelles notifications
                    loadNotificationPreviews();
                })
                .catch(error => console.error('Erreur lors du chargement:', error));
        });
    }
});