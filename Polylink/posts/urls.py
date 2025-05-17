from django.urls import path
from . import views

app_name = "posts"

urlpatterns = [
    path("post", views.PostView.as_view(), name="post"),
    path("image/<str:id>/", views.PostImageView.as_view(), name="post-image"),
    path("like/", views.LikeView.as_view(), name="like-post"),
    path("comment/<str:id>/", views.CommentView.as_view(), name="comment-post"),
]
