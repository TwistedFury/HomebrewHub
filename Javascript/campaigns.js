async function loadCampaigns()
{
    try
    {
        const response = await fetch("../Data/campaigns.json");

        if (!response.ok)
        {
            throw new error("Failed to load campaigns")
        }
    }
    catch 
    {

    }
}