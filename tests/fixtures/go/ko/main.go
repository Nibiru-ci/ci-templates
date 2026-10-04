package main

import (
	"fmt"
	"os"
)

func main() {
    fmt.Println("ko")
	f, _ := os.Open("x")
	f.Close()
}