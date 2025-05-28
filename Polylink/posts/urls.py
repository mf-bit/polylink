from django.urls import path
from . import views

app_name = "posts"

urlpatterns = [
    path("post/", views.PostView.as_view(), name="post"),
    path("post/<str:id>/", views.PostView.as_view(), name="delete-post"),
    path("image/<str:id>/", views.PostImageView.as_view(), name="post-image"),
    path("like/<str:id>/", views.LikeView.as_view(), name="like-post"),
    path("comment/<str:id>/", views.CommentView.as_view(), name="comment-post"),
    path("detail/<str:id>/", views.PostDetailView.as_view(), name="post-detail"),
]
