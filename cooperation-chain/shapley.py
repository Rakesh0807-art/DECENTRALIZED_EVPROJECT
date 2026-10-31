import itertools
from math import factorial

def shapley_value(player, players, value_function):
    n = len(players)
    others = [p for p in players if p != player]
    total = 0.0

    for r in range(len(others) + 1):
        for subset in itertools.combinations(others, r):
            coalition = set(subset)
            weight = (
                factorial(len(coalition)) *
                factorial(n - len(coalition) - 1)
            ) / factorial(n)
            marginal = value_function(coalition | {player}) - value_function(coalition)
            total += weight * marginal
    return total

def example():
    players = ["CS1", "CS2", "CS3"]
    values = {"CS1": 10, "CS2": 20, "CS3": 15}

    def v(coalition):
        return sum(values[p] for p in coalition)

    return {p: round(shapley_value(p, players, v), 4) for p in players}

if __name__ == "__main__":
    print(example())