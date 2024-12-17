from rest_framework import serializers
from .models import RoomData


class RoomDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomData
        fields = [
    {
        
        "room_name": "Living Room",
        "temperature": 24.5,
        "light_intensity": 75.2,
        "power_usage": 120.0
    },
    {
        
        "room_name": "Bedroom",
        "temperature": 22.3,
        "light_intensity": 50.6,
        "power_usage": 90.5
    }
]