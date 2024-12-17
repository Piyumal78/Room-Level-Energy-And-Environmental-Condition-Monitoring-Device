from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from .models import RoomData
from .serializers import RoomDataSerializer


class RoomDataList(APIView):
    def get(self, request):
        data = RoomData.objects.all().order_by('-timestamp')
        serializer = RoomDataSerializer(data, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = RoomDataSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RoomDataDetail(APIView):
    def get_object(self, pk):
        try:
            return RoomData.objects.get(pk=pk)
        except RoomData.DoesNotExist:
            return None

    def get(self, request, pk):
        room_data = self.get_object(pk)
        if room_data is None:
            return Response({'error': 'Data not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = RoomDataSerializer(room_data)
        return Response(serializer.data)

    def put(self, request, pk):
        room_data = self.get_object(pk)
        if room_data is None:
            return Response({'error': 'Data not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = RoomDataSerializer(room_data, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        room_data = self.get_object(pk)
        if room_data is None:
            return Response({'error': 'Data not found'}, status=status.HTTP_404_NOT_FOUND)
        room_data.delete()
        return Response({'message': 'Data deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
