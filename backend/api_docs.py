from flask import Blueprint, jsonify, render_template, request
from swagger_ui_bundle import swagger_ui_path

from .openapi import specification

docs = Blueprint(
    "api_docs", __name__, template_folder="templates",
    static_folder=swagger_ui_path, static_url_path="/api/docs/assets",
)


@docs.get("/api/openapi.json")
def openapi():
    spec = specification()
    spec["servers"] = [{"url": request.script_root or "/"}]
    return jsonify(spec)


@docs.get("/api/docs", strict_slashes=False)
def swagger():
    return render_template("api_docs.html")
