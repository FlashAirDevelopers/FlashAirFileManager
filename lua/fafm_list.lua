local current_path = arguments.current_path or "/"

-- Get file list under current_path
local result = {}
for file_name in lfs.dir(current_path) do
    local full_path = current_path .. "/" .. file_name
    local file_attr = lfs.attributes(full_path)
    table.insert(result, {
        name=file_name,
        mode=file_attr.mode,
        size=file_attr.size,
        modification=file_attr.modification
    })
end

return result