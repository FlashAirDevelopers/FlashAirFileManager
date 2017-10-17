-- Version 0.1.1

local current_path = arguments.current_path or "/"

-- Get file list under current_path
local result = {}
local full_path = ""
local file_attr = nil
local file_mode = ""
for file_name in lfs.dir(current_path) do
    -- Skip dot files
    if file_name:sub(0, 1) ~= "." then
        full_path = current_path .. "/" .. file_name
        file_attr = lfs.attributes(full_path)
        -- Filter file or directory only
        if (file_attr.mode == "file") or (file_attr.mode == "directory") then
            -- Set mode initials. file:"f", directory:"d"
            file_mode = string.sub(file_attr.mode, 0, 1)
            table.insert(result, {
                n=file_name,
                m=file_mode,
                u=file_attr.modification
            })
        end
    end
end

return result