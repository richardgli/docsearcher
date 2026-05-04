import { Search } from "lucide-react";

export default function Searchbar() {
    return (
        <>
            <div id="search-bar">
                <Search size={24} strokeWidth={1.5} />
                <input
                    type="text"
                    placeholder="Search"
                    autoComplete="off"
                />
            </div>
        </>
    )
}