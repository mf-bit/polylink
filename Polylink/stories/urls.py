from django.urls import path
from . import views

app_name = "stories"

urlpatterns = [
    path("", views.StoryView.as_view(), name="story"),
    path("<str:id>/", views.StoryView.as_view(), name="get-story"),
    path("<str:id>/", views.StoryView.as_view(), name="delete-story"),
    path("thumbnail/<str:id>/", views.StoryThumbnailView.as_view(), name="story-thumbnail"),  
    path("content/<str:id>/", views.StoryContentView.as_view(), name="story-content"),
]
