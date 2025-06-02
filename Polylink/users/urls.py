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
    path('search/<str:pattern>/', views.SearchView.as_view(), name='search'),
    path('following/', views.FollowingView.as_view(), name='get-followings'),
    path('following/<str:id>/', views.FollowingView.as_view(), name='follow'),
    path("notifications/<str:notification_id>/read/", views.MarkNotificationReadView.as_view(), name="mark-notification-read"),
    path("notifications/read/all/", views.MarkAllNotificationsReadView.as_view(), name="mark-all-read"),
    path("profile/<str:id>/", views.ProfileView.as_view(), name="profile"),
    path('relationship/graph/', views.RelationshipGraphView.as_view(), name='relationship-graph'),
]
