from django.shortcuts import render
import bson
from django.http import HttpRequest, HttpResponse
import db
from django.views import View
from datetime import datetime, timezone
from django import urls
import json

############# This is a Copilot code: must look it thoroughly after #########################
############# Look at an already build tool that do the job using AI (hint💡: github) ######
import cv2
import numpy as np
import tempfile
import io

def extract_first_frame_as_png(video_bytes: bytes) -> bytes:
    # Save video bytes to a temporary file
    with tempfile.NamedTemporaryFile(suffix='.mp4') as tmp_video:
        tmp_video.write(video_bytes)
        tmp_video.flush()

        # Open the video using OpenCV
        cap = cv2.VideoCapture(tmp_video.name)
        success, frame = cap.read()
        cap.release()

        if not success:
            raise ValueError("Could not read a frame from the video.")

        # Encode frame to PNG format
        success, png_encoded = cv2.imencode('.png', frame)
        if not success:
            raise ValueError("Failed to encode frame as PNG.")

        return png_encoded.tobytes()
#############################################################################################

class StoryView(View):
    def get(self, request:HttpRequest, id:str):
        story = db.db.stories.find_one({"_id": bson.ObjectId(id)})
        # In Django template we must not have a variable staring with an underscore: so _id has to be rename
        story["id"] = story["_id"]
        return render(request, "stories/story.html", {"story": story})
    
    def post(self, request:HttpRequest):
        # Retrive the user's id
        user_id = db.get_user_id(request)
        content_file = request.FILES.get("content")
        content = content_file.read()
        format = content_file.name[content_file.name.rfind(".") + 1: len(content_file.name)]
        thumbnail = extract_first_frame_as_png(content)
        thumbnail_format = "png"

        inserted_story = db.db.stories.insert_one(
            {
                "author": bson.ObjectId(user_id),
                "format": format,
                "thumbnail_format": thumbnail_format,
                "date": datetime.now(timezone.utc),
                "views": 0,
                "likes": 0,
                "thumbnail": bson.Binary(thumbnail),
                "content": bson.Binary(content),
            }
        )

        # The front the url that fetch this inserted story
        content_url = urls.reverse("stories:get-story", kwargs={"id": str(inserted_story.inserted_id)})
        thumbnail_url = urls.reverse("stories:story-thumbnail", kwargs={"id": str(inserted_story.inserted_id)})
        delete_url = urls.reverse("stories:delete-story", kwargs={"id": str(inserted_story.inserted_id)})
        response_body = {
            "content_url" : content_url,
            "thumbnail_url": thumbnail_url,
            "delete_url": delete_url,
        }   
        response = HttpResponse(content=json.dumps(response_body), content_type="application/json")
        return response
    
    def delete(self, request, id:str):
        db.db.stories.delete_one({"_id": bson.ObjectId(id)})
        response = HttpResponse()
        response.status_code = 204
        return response

class StoryThumbnailView(View):
    def get(self, request, id:str):
        story = db.db["stories"].find_one({"_id": bson.ObjectId(id)})
        img_bytes = bytes(story["thumbnail"])
        content_type = f"image/{story["thumbnail_format"]}"
        return HttpResponse(content=img_bytes, content_type=content_type)
    
class StoryContentView(View):
    def get(self, request, id:str):
        story = db.db["stories"].find_one({"_id": bson.ObjectId(id)})
        vid_bytes = bytes(story["content"])
        content_type = f"video/{story["format"]}"
        return HttpResponse(content=vid_bytes, content_type=content_type)
    

