from django.urls import path
from . import views

app_name = "users"

urlpatterns = [
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("home/", views.HomeView.as_view(), name="home"),
    path("explore/", views.ExploreView.as_view(), name="explore"),
    path("avatar/<str:id>/", views.AvatarView.as_view(), name="avatar"),
]
