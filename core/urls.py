from django.urls import path
from . import views

urlpatterns = [
    path('', views.landing_page, name='landing'),
    path('app/', views.connect_page, name='app'),
    path('ask-ai/', views.ask_ai, name='ask_ai'),
]