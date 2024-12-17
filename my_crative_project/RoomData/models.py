from django.db import models

class RoomData(models.Model):
    room_name = models.CharField(max_length=100)
    temperature = models.FloatField()
    light_intensity = models.FloatField()
    power_usage = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)  # Add this line

    def __str__(self):
        return self.room_name
