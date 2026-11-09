Set oWS = CreateObject("WScript.Shell")
strDesktop = oWS.SpecialFolders("Desktop")
strCurrentDir = oWS.CurrentDirectory

' Shortcut 1: Khmer Name
Set oLink = oWS.CreateShortcut(strDesktop & "\កម្មវិធីគ្រប់គ្រងពិន្ទុសិស្ស ថ្នាក់ទី១២A.lnk")
oLink.TargetPath = strCurrentDir & "\index.html"
oLink.WorkingDirectory = strCurrentDir
oLink.IconLocation = strCurrentDir & "\app-icon.ico,0"
oLink.Description = "School Management 12A"
oLink.Save

' Shortcut 2: English Name (for safe guarantee)
Set oLink2 = oWS.CreateShortcut(strDesktop & "\School_Management_12A.lnk")
oLink2.TargetPath = strCurrentDir & "\index.html"
oLink2.WorkingDirectory = strCurrentDir
oLink2.IconLocation = strCurrentDir & "\app-icon.ico,0"
oLink2.Description = "School Management 12A"
oLink2.Save
