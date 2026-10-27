#!/usr/bin/env python3
"""Keep only the named animations in a .glb and drop the data the rest used.

Usage: python3 scripts/trim-glb-animations.py in.glb out.glb "CharacterArmature|Idle_Neutral" [...]

Standard library only. Assumes a single binary buffer, which is what
FBX2glTF and most exporters write.
"""
import json
import struct
import sys

GLB_MAGIC = 0x46546C67
JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def read_glb(path):
    data = open(path, "rb").read()
    magic, _version, _length = struct.unpack_from("<III", data, 0)
    if magic != GLB_MAGIC:
        sys.exit(f"{path} is not a .glb file")
    offset, doc, binary = 12, None, b""
    while offset < len(data):
        size, kind = struct.unpack_from("<II", data, offset)
        chunk = data[offset + 8 : offset + 8 + size]
        if kind == JSON_CHUNK:
            doc = json.loads(chunk)
        elif kind == BIN_CHUNK:
            binary = chunk
        offset += 8 + size
    return doc, binary


def write_glb(path, doc, binary):
    text = json.dumps(doc, separators=(",", ":")).encode()
    text += b" " * (-len(text) % 4)
    binary += b"\0" * (-len(binary) % 4)
    length = 12 + 8 + len(text) + 8 + len(binary)
    with open(path, "wb") as out:
        out.write(struct.pack("<III", GLB_MAGIC, 2, length))
        out.write(struct.pack("<II", len(text), JSON_CHUNK) + text)
        out.write(struct.pack("<II", len(binary), BIN_CHUNK) + binary)


def accessors_used(node, found):
    """Every accessor index referenced anywhere outside animations."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key in ("indices", "inverseBindMatrices") and isinstance(value, int):
                found.add(value)
            elif key in ("attributes",) and isinstance(value, dict):
                found.update(value.values())
            elif key == "targets" and isinstance(value, list):
                for target in value:
                    found.update(target.values())
            else:
                accessors_used(value, found)
    elif isinstance(node, list):
        for item in node:
            accessors_used(item, found)
    return found


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    src, dst, keep = sys.argv[1], sys.argv[2], set(sys.argv[3:])
    doc, binary = read_glb(src)
    if len(doc.get("buffers", [])) != 1:
        sys.exit("expected exactly one buffer")

    animations = [a for a in doc.get("animations", []) if a.get("name") in keep]
    missing = keep - {a.get("name") for a in animations}
    if missing:
        sys.exit(f"animations not found: {sorted(missing)}")
    doc["animations"] = animations

    # Accessors still in use: the meshes' and skins', plus the kept clips'
    rest = {k: v for k, v in doc.items() if k not in ("animations", "accessors", "bufferViews")}
    used = accessors_used(rest, set())
    for anim in animations:
        for sampler in anim["samplers"]:
            used.update((sampler["input"], sampler["output"]))

    accessor_map = {old: new for new, old in enumerate(sorted(used))}
    accessors = [doc["accessors"][old] for old in sorted(used)]
    views_used = sorted({a["bufferView"] for a in accessors if "bufferView" in a})
    view_map = {old: new for new, old in enumerate(views_used)}

    # Repack the kept buffer views, each 4-byte aligned
    packed, views = bytearray(), []
    for old in views_used:
        view = dict(doc["bufferViews"][old])
        start = view.get("byteOffset", 0)
        packed += b"\0" * (-len(packed) % 4)
        view["byteOffset"] = len(packed)
        packed += binary[start : start + view["byteLength"]]
        views.append(view)
    for accessor in accessors:
        if "bufferView" in accessor:
            accessor["bufferView"] = view_map[accessor["bufferView"]]

    def remap(node):
        if isinstance(node, dict):
            for key, value in node.items():
                if key in ("indices", "inverseBindMatrices", "input", "output") and isinstance(value, int):
                    node[key] = accessor_map[value]
                elif key == "attributes" and isinstance(value, dict):
                    node[key] = {k: accessor_map[v] for k, v in value.items()}
                elif key == "targets" and isinstance(value, list):
                    node[key] = [{k: accessor_map[v] for k, v in t.items()} for t in value]
                else:
                    remap(value)
        elif isinstance(node, list):
            for item in node:
                remap(item)

    for key in rest:
        remap(doc[key])
    remap(doc["animations"])
    if any("bufferView" in i for i in doc.get("images", [])):
        sys.exit("embedded images are not handled")
    doc["accessors"], doc["bufferViews"] = accessors, views
    doc["buffers"][0]["byteLength"] = len(packed)
    write_glb(dst, doc, bytes(packed))
    print(f"{src}: {len(binary)} -> {len(packed)} bytes of binary data")


if __name__ == "__main__":
    main()
