param()
Write-Host "Test OK"
$test = "hello"
if ($test -match '^\d+$') {
    Write-Host "match"
}