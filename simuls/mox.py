import random

def simulate_game(num_mox, simulations=10000):
    successes = 0

    for _ in range(simulations):
        cards=[19-num_mox,num_mox,1]
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
        if hand[1]==0: continue
        
        while cards_left>0:
            if hand[0]==0: break
            hand[0]-=1
            draw(3)

        if cards_left==0:
            successes+=1
    
    return successes / simulations

def find_best_composition():
    best_success_rate = 0
    best_composition = (0, 0)

    for num_mox in range(1,13):
        success_rate = simulate_game(num_mox)
        print(f"comp: {num_mox} / succ: {success_rate:.4f}")
        if success_rate > best_success_rate:
            best_success_rate = success_rate
            best_composition = num_mox
    
    return best_composition, best_success_rate

# Let's assume deck_size is 20
best_composition, best_success_rate = find_best_composition()
print(f"Best composition: {best_composition} with success rate: {best_success_rate:.4f}")