from pricing import apply_discount

def test_discount_at_threshold():
    assert apply_discount(100) == 90.0

def test_no_discount_below_threshold():
    assert apply_discount(99.99) == 99.99

if __name__ == "__main__":
    test_discount_at_threshold()
    test_no_discount_below_threshold()
    print("all tests passed")
