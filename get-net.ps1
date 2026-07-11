Get-NetIPConfiguration | Where-Object {$_.IPv4DefaultGateway -ne $null} | ForEach-Object {
    Write-Host "Interface: $($_.InterfaceAlias)"
    Write-Host "IP: $($_.IPv4Address.IPAddress)"
    Write-Host "Prefix: $($_.IPv4Address.PrefixLength)"
    Write-Host "Gateway: $($_.IPv4DefaultGateway.NextHop)"
    Write-Host "DNS: $(($_.DNSServer.ServerAddresses) -join ', ')"
}
