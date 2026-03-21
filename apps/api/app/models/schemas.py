from pydantic import BaseModel


class GenerateVideoRequest(BaseModel):
    text: str
    language: str