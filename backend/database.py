import json
from datetime import datetime, timezone

from sqlalchemy import (
    Column, ForeignKey, Float, Integer, String, DateTime, UniqueConstraint,
    create_engine,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./training.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard"

    id = Column(Integer, primary_key=True, index=True)
    player_name = Column(String, nullable=False)
    module_id = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    scenarios_completed = Column(Integer, nullable=False)
    accuracy = Column(Float, nullable=False)  # 0.0 - 1.0
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Volunteer(Base):
    __tablename__ = "volunteers"
    __table_args__ = (UniqueConstraint("name", name="uix_volunteers_name"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slack_handle = Column(String, nullable=False)  # e.g. "@julian"
    # Stored as JSON string: ["registration", "safety-marshal"]
    _assigned_modules = Column("assigned_modules", String, nullable=False, default="[]")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    @property
    def assigned_modules(self) -> list[str]:
        return json.loads(self._assigned_modules)

    @assigned_modules.setter
    def assigned_modules(self, value: list[str]) -> None:
        self._assigned_modules = json.dumps(value)


class ModuleCompletion(Base):
    __tablename__ = "module_completions"
    __table_args__ = (
        UniqueConstraint("volunteer_id", "module_id", name="uix_completion"),
    )

    id = Column(Integer, primary_key=True, index=True)
    volunteer_id = Column(Integer, ForeignKey("volunteers.id"), nullable=False)
    module_id = Column(String, nullable=False)
    best_score = Column(Integer, nullable=False)
    best_accuracy = Column(Float, nullable=False)
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
