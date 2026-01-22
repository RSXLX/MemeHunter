import sys
code_string = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
def decode(s):
    dec = 0
    for char in s:
        dec = dec * 58 + code_string.index(char)
    return list(dec.to_bytes((dec.bit_length() + 7) // 8, "big"))

if __name__ == "__main__":
    res = decode("CPo1f4ZNjCsnE9WEFUmd3oYKzo43ANejAFpWF44R3fqjv")
    print(f"Length: {len(res)}")
    print(res)
