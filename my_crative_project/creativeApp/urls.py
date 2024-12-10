from django.urls import path
from .views import room_data_list, room_data_detail

urlpatterns = [
    path('room-data/', room_data_list, name='room-data-list'),
    path('room-data/<int:pk>/', room_data_detail, name='room-data-detail'),
]
