from django.db import models

class RoomData(models.Model):
    room_name = models.CharField(max_length=100)
    power_usage = models.FloatField(help_text="Power usage in watts")
    temperature = models.FloatField(help_text="Temperature in Celsius")
    light_intensity = models.FloatField(help_text="Light intensity in lumens")
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.room_name} - {self.timestamp}"
