$files = Get-ChildItem -File | Where-Object { $_.Extension -in '.html', '.json', '.ico', '.png', '.bat', '.vbs', '.ps1', '.xlsx' } | Select-Object -ExpandProperty Name
$dirs = @('css', 'js') | Where-Object { Test-Path $_ }
$all = @($files) + @($dirs)
Compress-Archive -Path $all -DestinationPath 'Update_Package.zip' -Force
Write-Host "Update_Package.zip created successfully."
