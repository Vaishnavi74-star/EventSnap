import logging
import os
import json
from typing import Any, Dict, Optional

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logger = logging.getLogger("EventSnap")
logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

# Use standard formatting if not set
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s in %(module)s (%(funcName)s:%(lineno)d): %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)


def log_event(event_name: str, context: Optional[Dict[str, Any]] = None, level: str = "INFO"):
    payload = {
        "event": event_name,
        "context": context or {},
    }
    log_func = getattr(logger, level.lower(), logger.info)
    log_func(json.dumps(payload, default=str))

