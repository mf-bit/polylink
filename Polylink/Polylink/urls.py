
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('user/', include("users.urls")),
    path("post/", include("posts.urls")),
    path("stories/", include("stories.urls")),
]
