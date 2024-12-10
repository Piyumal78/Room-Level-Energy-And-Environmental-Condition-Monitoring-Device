from rest_framework import serializers
from .models import RoomData


class RoomDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomData
        fields = '__all__'
