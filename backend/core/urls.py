from django.urls import path
from . import views

urlpatterns = [
    path('api/connect/', views.connect_page, name='connect'),
    path('api/ask/', views.ask_ai, name='ask_ai'),
]