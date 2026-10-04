<?php

namespace App;

class Greeter
{
    public function hello(string $name): string
    {
        return 'Hello '.$name;
    }
}