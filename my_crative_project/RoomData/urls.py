from django.urls import path
from .views import RoomDataList, RoomDataDetail

urlpatterns = [
    path('room-data/', RoomDataList.as_view(), name='room-data-list'),
    path('room-data/<int:pk>/', RoomDataDetail.as_view(), name='room-data-detail'),
]
