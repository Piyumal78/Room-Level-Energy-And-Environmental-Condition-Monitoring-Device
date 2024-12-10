from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import RoomData
from .serializers import RoomDataSerializer


@api_view(['GET', 'POST'])
def room_data_list(request):
    if request.method == 'GET':
        data = RoomData.objects.all().order_by('-timestamp')
        serializer = RoomDataSerializer(data, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = RoomDataSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def room_data_detail(request, pk):
    try:
        room_data = RoomData.objects.get(pk=pk)
    except RoomData.DoesNotExist:
        return Response({'error': 'Data not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = RoomDataSerializer(room_data)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = RoomDataSerializer(room_data, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        room_data.delete()
        return Response({'message': 'Data deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
