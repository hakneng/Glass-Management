$source = @"
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text;

[ComImport]
[Guid("00021401-0000-0000-C000-000000000046")]
public class ShellLink {}

[ComImport]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
[Guid("000214F9-0000-0000-C000-000000000046")]
public interface IShellLinkW
{
    void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszFile, int cchMaxPath, out IntPtr pfd, int fFlags);
    void GetIDList(out IntPtr ppidl);
    void SetIDList(IntPtr pidl);
    void GetDescription([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszName, int cchMaxName);
    void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string pszName);
    void GetWorkingDirectory([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszDir, int cchMaxPath);
    void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string pszDir);
    void GetArguments([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszArgs, int cchMaxPath);
    void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string pszArgs);
    void GetHotkey(out short pwHotkey);
    void SetHotkey(short wHotkey);
    void GetShowCmd(out int piShowCmd);
    void SetShowCmd(int iShowCmd);
    void GetIconLocation([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszIconPath, int cchIconPath, out int piIcon);
    void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string pszIconPath, int iIcon);
    void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string pszPathRel, int dwReserved);
    void Resolve(IntPtr hwnd, int fFlags);
    void SetPath([MarshalAs(UnmanagedType.LPWStr)] string pszFile);
}

public static class ShellHelper
{
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);

    public static void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string iconPath, string description)
    {
        IShellLinkW link = (IShellLinkW)new ShellLink();
        link.SetPath(targetPath);
        link.SetWorkingDirectory(workingDir);
        link.SetDescription(description);
        if (!string.IsNullOrEmpty(iconPath)) {
            link.SetIconLocation(iconPath, 0);
        }
        IPersistFile file = (IPersistFile)link;
        file.Save(shortcutPath, true);
    }

    public static void Refresh()
    {
        SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'ShellHelper').Type) {
    Add-Type -TypeDefinition $source
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }

$desktopLocations = @(
    [System.Environment]::GetFolderPath('Desktop'),
    [System.IO.Path]::Combine($env:USERPROFILE, 'Desktop')
)
$oneDriveDesktop = [System.IO.Path]::Combine($env:USERPROFILE, 'OneDrive', 'Desktop')
if (Test-Path $oneDriveDesktop) {
    $desktopLocations += $oneDriveDesktop
}

$target = [System.IO.Path]::Combine($scriptDir, "index.html")
$icon = [System.IO.Path]::Combine($scriptDir, "app-icon.ico")
$desc = "ប្រព័ន្ធគ្រប់គ្រងពិន្ទុសិស្ស និងព្រឹត្តិបត្រឌីជីថល (ថ្នាក់ទី១២A)"

$createdAny = $false
foreach ($desk in ($desktopLocations | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $desk) {
        $lnk = [System.IO.Path]::Combine($desk, "កម្មវិធីគ្រប់គ្រងពិន្ទុសិស្ស ថ្នាក់ទី១២A.lnk")
        [ShellHelper]::CreateShortcut($lnk, $target, $scriptDir, $icon, $desc)
        if (Test-Path -LiteralPath $lnk) {
            Write-Host "[SUCCESS] Created shortcut: $lnk"
            $createdAny = $true
        }
    }
}

[ShellHelper]::Refresh()

if ($createdAny) {
    Write-Host "[OK] Desktop refreshed and Icon ready."
} else {
    Write-Host "[ERROR] Could not create shortcut on Desktop."
}
