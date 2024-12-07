import argparse
import json

argu = argparse.ArgumentParser(description='Convert frequency to rank')
argu.add_argument('filename', type=str, help='The filename to read')

args = argu.parse_args()

with open(args.filename, 'r') as f:
    rank = 0
    next_rank = rank+1
    ranks = {}
    last_freq = None
    for line in f:
        word, freq, reading, _ = line.split('\t')
        if freq != last_freq:
            rank = next_rank
        ranks[word] = rank
        last_freq = freq
        next_rank += 1


with open("output.js", 'w') as f:
    f.write("var terms_anime = ")
    json.dump(ranks, f, ensure_ascii=False)
    f.write(";")