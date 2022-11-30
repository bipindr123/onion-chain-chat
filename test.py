import rsa
import json
import zlib

hh = [200, 800, 1600, 2600]
d={}
for i in range(22):
    keys = {}
    for j in hh:
        publicKey, privateKey = rsa.newkeys(j)
        keys[j] = [publicKey.save_pkcs1().decode('utf8'), privateKey.save_pkcs1().decode('utf8')]
        # keys[j] = [publicKey, privateKey]
    d[i] = keys
    print(i)

fp  = open("bipinkeys4.json","a")
json.dump(d,fp)

# mes = b'12345678901234'
# en = rsa.encrypt(mes, d[0][200][0])
# print(en)
# print(len(en))

# en2 = zlib.compress(en)
# print(len(en2))
# en2 = rsa.encrypt(en2, d[1][0])
# print(len(en2))

# fp  = open("bipinkeys.json2","a")
# json.dump(d,fp)


# import zlib

# a = "this string needs compressing"
# print(len(a))
# a = zlib.compress(a.encode())
# print(a)
# print(len(a))
# print(zlib.decompress(a).decode()) 