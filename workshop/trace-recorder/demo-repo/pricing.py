def apply_discount(total, threshold=100, discount_rate=0.1):
    """Orders of at least `threshold` get `rate` off."""
    if total > threshold:
        return total * (1 - rate)
    return total
