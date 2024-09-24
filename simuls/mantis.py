import random

def simulate_game(num_mantis, simulations=10000):
    successes = 0

    for _ in range(simulations):
        cards=[20-num_mantis,num_mantis]
        cards_left=20
        hand=[0]*len(cards)

        def draw(amt):
            nonlocal cards_left,cards,hand

            amt=min(amt,cards_left)
            for _ in range(amt):
                rng=random.randrange(0,cards_left)
                sum=0
                for j in range(len(cards)):
                    sum+=cards[j]
                    if rng<sum:
                        break
                
                cards_left-=1
                cards[j]-=1
                hand[j]+=1

        draw(4)
        if not(hand[0]==4 or hand[1]>=3):
            successes+=1
    
    return successes / simulations

def find_best_composition():
    best_success_rate = 0
    best_composition = (0, 0)

    for num_mantis in range(1,13):
        success_rate = simulate_game(num_mantis)
        print(f"comp: {num_mantis} / succ: {success_rate:.4f}")
        if success_rate > best_success_rate:
            best_success_rate = success_rate
            best_composition = num_mantis
    
    return best_composition, best_success_rate

# Let's assume deck_size is 20
best_composition, best_success_rate = find_best_composition()
print(f"Best composition: {best_composition} with success rate: {best_success_rate:.4f}")