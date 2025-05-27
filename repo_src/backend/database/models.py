from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func # for server_default=func.now()
from repo_src.backend.database.connection import Base

# Item model removed as part of v2 clean UI refactor 