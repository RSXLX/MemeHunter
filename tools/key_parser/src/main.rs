fn main() {
    let s = "2wcJurfHTPJKbQW46ktQV7HQG4UKYBdSqtaVRcbwhPDm";
    match bs58::decode(s).into_vec() {
        Ok(d) => {
            println!("{:?}", d);
            println!("Len: {}", d.len());
        },
        Err(e) => println!("Error: {:?}", e),
    }
}
