from django.urls import path
from . import views

app_name = 'conversations'

urlpatterns = [
    path('<str:id>/', views.ConversationView.as_view(), name='conversation'),
    path('start/<str:username>/', views.ConversationView.as_view(), name='start-conversation'),
    path('message/<str:id>/', views.MessageView.as_view(), name='message'),
]
