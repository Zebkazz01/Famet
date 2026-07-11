# Configurar IP estática en interfaz Ethernet
$interface = "Ethernet"
$ip = "192.168.100.7"
$prefix = 24
$gateway = "192.168.100.1"
$dns = @("8.8.8.8", "8.8.4.4")

# Quitar configuración DHCP existente
Remove-NetIPAddress -InterfaceAlias $interface -Confirm:$false -ErrorAction SilentlyContinue
Remove-NetRoute -InterfaceAlias $interface -Confirm:$false -ErrorAction SilentlyContinue

# Asignar IP estática
New-NetIPAddress -InterfaceAlias $interface -IPAddress $ip -PrefixLength $prefix -DefaultGateway $gateway

# Configurar DNS
Set-DnsClientServerAddress -InterfaceAlias $interface -ServerAddresses $dns

Write-Host ""
Write-Host "IP estatica configurada:" -ForegroundColor Green
Write-Host "  IP: $ip"
Write-Host "  Gateway: $gateway"
Write-Host "  DNS: $($dns -join ', ')"
Write-Host ""
Write-Host "Desde movil accede a: http://${ip}:5174" -ForegroundColor Cyan
